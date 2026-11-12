using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

internal static class Server
{
    private static volatile bool stopping;
    private static readonly Dictionary<string, string> Mime = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        { ".html", "text/html; charset=utf-8" },
        { ".css", "text/css; charset=utf-8" },
        { ".js", "text/javascript; charset=utf-8" },
        { ".svg", "image/svg+xml" },
        { ".ico", "image/x-icon" }
    };

    private static int Main(string[] args)
    {
        string root = Path.GetFullPath(args.Length > 0 ? args[0] : AppDomain.CurrentDomain.BaseDirectory);
        int port = 8080;
        bool browser = true;
        for (int i = 1; i < args.Length; i++)
        {
            if (args[i] == "--no-browser") browser = false;
            else if (!int.TryParse(args[i], out port) || port < 1024 || port > 65535)
            {
                Console.Error.WriteLine("Invalid port. Usage: Spiel-starten.cmd [8081] [--no-browser]");
                return 1;
            }
        }
        if (!File.Exists(Path.Combine(root, "index.html")))
        {
            Console.Error.WriteLine("Game folder not found: " + root);
            return 1;
        }
        ScoreStore scores = new ScoreStore(Path.Combine(root, "data", "scores.json"));
        TcpListener listener = new TcpListener(IPAddress.Loopback, port);
        try { listener.Start(); }
        catch (SocketException error)
        {
            Console.Error.WriteLine("Cannot start local server: " + error.Message);
            Console.Error.WriteLine("Port occupied? Try: Spiel-starten.cmd 8081");
            return 1;
        }
        Console.CancelKeyPress += delegate(object sender, ConsoleCancelEventArgs e)
        {
            e.Cancel = true;
            stopping = true;
            listener.Stop();
        };
        string url = "http://127.0.0.1:" + port.ToString(CultureInfo.InvariantCulture) + "/";
        Console.WriteLine("\n  GIPFELSPRUNG - Dein Schweizer Abenteuer\n");
        Console.WriteLine("  Spiel bereit: " + url);
        Console.WriteLine("  Fenster offen lassen. Beenden mit Strg+C.");
        Console.WriteLine("  Nur auf diesem Computer erreichbar.\n");
        if (browser)
        {
            try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); }
            catch (System.ComponentModel.Win32Exception error)
            {
                Console.Error.WriteLine("Browser could not open: " + error.Message + "\nOpen " + url + " manually.");
            }
        }
        try
        {
            while (!stopping)
            {
                TcpClient client;
                try { client = listener.AcceptTcpClient(); }
                catch (SocketException) { if (stopping) break; throw; }
                ThreadPool.QueueUserWorkItem(delegate { Handle(client, root, scores, port); });
            }
        }
        finally { listener.Stop(); }
        return 0;
    }

    private static void Handle(TcpClient client, string root, ScoreStore scores, int port)
    {
        using (client)
        {
            client.ReceiveTimeout = 5000;
            client.SendTimeout = 5000;
            try
            {
                using (NetworkStream stream = client.GetStream())
                {
                    StringBuilder header = new StringBuilder();
                    while (header.Length < 8192)
                    {
                        int value = stream.ReadByte();
                        if (value < 0) return;
                        header.Append((char)value);
                        int len = header.Length;
                        if (len >= 4 && header[len - 4] == '\r' && header[len - 3] == '\n' && header[len - 2] == '\r' && header[len - 1] == '\n') break;
                    }
                    if (header.Length >= 8192) { Send(stream, 431, "Request header too large.", false); return; }
                    string[] lines = header.ToString().Split(new[] { "\r\n" }, StringSplitOptions.None);
                    string[] request = lines[0].Split(' ');
                    if (request.Length != 3 || !request[1].StartsWith("/", StringComparison.Ordinal))
                    { Send(stream, 400, "Invalid request.", false); return; }
                    bool head = request[0] == "HEAD";
                    if (request[1].Split('?')[0] == "/api/scores")
                    {
                        Dictionary<string, string> headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                        foreach (string line in lines.Skip(1).Where(line => line.Length > 0))
                        {
                            int colon = line.IndexOf(':');
                            if (colon < 1 || headers.ContainsKey(line.Substring(0, colon)))
                            { JsonReply(stream, 400, new { error = "Invalid headers." }, head); return; }
                            headers.Add(line.Substring(0, colon), line.Substring(colon + 1).Trim());
                        }
                        HandleScores(stream, request[0], headers, scores, port);
                        return;
                    }
                    if (request[0] != "GET" && !head) { Send(stream, 405, "Method not allowed.", false); return; }
                    string relative;
                    string path;
                    try
                    {
                        relative = Uri.UnescapeDataString(request[1].Split('?')[0]).TrimStart('/').Replace('/', '\\');
                        if (relative.Length == 0 || relative.EndsWith("\\", StringComparison.Ordinal)) relative += "index.html";
                        path = Path.GetFullPath(Path.Combine(root, relative));
                    }
                    catch (ArgumentException) { Send(stream, 400, "Invalid path.", head); return; }
                    catch (NotSupportedException) { Send(stream, 400, "Invalid path.", head); return; }
                    catch (PathTooLongException) { Send(stream, 400, "Invalid path.", head); return; }
                    catch (UriFormatException) { Send(stream, 400, "Invalid path.", head); return; }
                    string type;
                    if (!path.StartsWith(root.TrimEnd('\\') + "\\", StringComparison.OrdinalIgnoreCase) || !Mime.TryGetValue(Path.GetExtension(path), out type))
                    { Send(stream, 403, "Access denied.", head); return; }
                    if (!File.Exists(path)) { Send(stream, 404, "File not found.", head); return; }
                    byte[] bytes;
                    try { bytes = File.ReadAllBytes(path); }
                    catch (IOException error) { Console.Error.WriteLine("Cannot read asset: " + error.Message); Send(stream, 500, "Cannot read game asset.", head); return; }
                    catch (UnauthorizedAccessException error) { Console.Error.WriteLine("Cannot read asset: " + error.Message); Send(stream, 403, "Access denied.", head); return; }
                    Reply(stream, 200, "OK", type, bytes, head);
                }
            }
            catch (IOException error) { Console.Error.WriteLine("Connection closed: " + error.Message); }
            catch (SocketException error) { Console.Error.WriteLine("Connection failed: " + error.Message); }
        }
    }

    private static void HandleScores(NetworkStream stream, string method, Dictionary<string, string> headers, ScoreStore scores, int port)
    {
        bool head = method == "HEAD";
        if (method != "GET" && !head && method != "POST")
        { JsonReply(stream, 405, new { error = "Only GET, HEAD and POST are supported." }, false); return; }
        try
        {
            if (method == "POST")
            {
                string contentType;
                string origin;
                string length;
                int size;
                if (!headers.TryGetValue("Content-Type", out contentType) || !contentType.Split(';')[0].Trim().Equals("application/json", StringComparison.OrdinalIgnoreCase))
                { JsonReply(stream, 415, new { error = "Content-Type must be application/json." }, false); return; }
                string expectedOrigin = "http://127.0.0.1:" + port.ToString(CultureInfo.InvariantCulture);
                string localhostOrigin = "http://localhost:" + port.ToString(CultureInfo.InvariantCulture);
                if (headers.TryGetValue("Origin", out origin) && origin != expectedOrigin && origin != localhostOrigin)
                { JsonReply(stream, 403, new { error = "Use the local game page to submit a score." }, false); return; }
                if (headers.ContainsKey("Transfer-Encoding") || !headers.TryGetValue("Content-Length", out length) || !int.TryParse(length, out size) || size <= 0 || size > 4096)
                { JsonReply(stream, 400, new { error = "A JSON body of up to 4096 bytes is required." }, false); return; }
                byte[] body = new byte[size];
                int offset = 0;
                while (offset < size)
                {
                    int count = stream.Read(body, offset, size - offset);
                    if (count == 0) { JsonReply(stream, 400, new { error = "Incomplete JSON body." }, false); return; }
                    offset += count;
                }
                ScoreEntry entry;
                try
                {
                    string json = new UTF8Encoding(false, true).GetString(body);
                    entry = new JavaScriptSerializer().Deserialize<ScoreEntry>(json);
                    ScoreStore.Validate(entry);
                }
                catch (ArgumentException) { JsonReply(stream, 400, new { error = "Invalid score. Check name, coins and game result." }, false); return; }
                catch (InvalidOperationException) { JsonReply(stream, 400, new { error = "Invalid score JSON." }, false); return; }
                scores.Save(entry);
            }
            JsonReply(stream, 200, new { scores = scores.ReadTop() }, head);
        }
        catch (InvalidDataException error) { ScoreError(stream, error, head); }
        catch (IOException error) { ScoreError(stream, error, head); }
        catch (UnauthorizedAccessException error) { ScoreError(stream, error, head); }
        catch (InvalidOperationException error) { ScoreError(stream, error, head); }
        catch (ArgumentException error) { ScoreError(stream, error, head); }
    }

    private static void ScoreError(NetworkStream stream, Exception error, bool head)
    {
        Console.Error.WriteLine("Leaderboard could not be read or saved: " + error.Message);
        JsonReply(stream, 500, new { error = "Leaderboard could not be read or saved. Check the server window and data folder." }, head);
    }

    private static void JsonReply(NetworkStream stream, int code, object value, bool head)
    {
        string status = code == 200 ? "OK" : "Request failed";
        Reply(stream, code, status, "application/json; charset=utf-8", Encoding.UTF8.GetBytes(new JavaScriptSerializer().Serialize(value)), head, "GET, HEAD, POST");
    }

    private static void Send(NetworkStream stream, int code, string message, bool head)
    {
        Reply(stream, code, message.TrimEnd('.'), "text/plain; charset=utf-8", Encoding.UTF8.GetBytes(message), head);
    }

    private static void Reply(NetworkStream stream, int code, string status, string type, byte[] bytes, bool head, string allow = "GET, HEAD")
    {
        string header = "HTTP/1.1 " + code + " " + status + "\r\nContent-Type: " + type
            + "\r\nContent-Length: " + bytes.Length.ToString(CultureInfo.InvariantCulture)
            + "\r\nConnection: close\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\n"
            + (code == 405 ? "Allow: " + allow + "\r\n" : "")
            + "\r\n";
        byte[] headers = Encoding.ASCII.GetBytes(header);
        stream.Write(headers, 0, headers.Length);
        if (!head) stream.Write(bytes, 0, bytes.Length);
    }
}

internal sealed class ScoreEntry
{
    public ScoreEntry() { }
    public string id { get; set; }
    public string name { get; set; }
    public int coins { get; set; }
    public int skin { get; set; }
    public int level { get; set; }
    public bool completed { get; set; }
    public string createdAt { get; set; }
}

internal sealed class ScoreStore
{
    private readonly string path;
    private readonly object gate = new object();

    internal ScoreStore(string path) { this.path = path; }

    internal static void Validate(ScoreEntry entry)
    {
        Guid id;
        if (entry == null || !Guid.TryParse(entry.id, out id) || string.IsNullOrWhiteSpace(entry.name)
            || entry.name.Trim().Length > 24 || entry.name.Any(char.IsControl)
            || entry.coins < 0 || entry.coins > 100000 || entry.skin < 0 || entry.skin > 4
            || entry.level < 1 || entry.level > 5 || (entry.completed && entry.level != 5))
            throw new ArgumentException("Invalid score entry.");
    }

    private List<ScoreEntry> ReadAll()
    {
        string json;
        try { json = File.ReadAllText(path, Encoding.UTF8); }
        catch (FileNotFoundException) { return new List<ScoreEntry>(); }
        catch (DirectoryNotFoundException) { return new List<ScoreEntry>(); }
        List<ScoreEntry> entries = new JavaScriptSerializer().Deserialize<List<ScoreEntry>>(json);
        if (entries == null) throw new InvalidDataException("Leaderboard file must contain a list.");
        foreach (ScoreEntry entry in entries)
        {
            Validate(entry);
            DateTimeOffset created;
            if (!DateTimeOffset.TryParse(entry.createdAt, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out created))
                throw new InvalidDataException("Leaderboard entry has an invalid timestamp.");
        }
        return entries;
    }

    internal List<ScoreEntry> ReadTop()
    {
        lock (gate)
        {
            return ReadAll().OrderByDescending(entry => entry.coins)
                .ThenBy(entry => entry.createdAt, StringComparer.Ordinal)
                .ThenBy(entry => entry.id, StringComparer.Ordinal).Take(10).ToList();
        }
    }

    internal void Save(ScoreEntry entry)
    {
        Validate(entry);
        lock (gate)
        {
            List<ScoreEntry> entries = ReadAll();
            string id = Guid.Parse(entry.id).ToString();
            if (entries.Any(saved => saved.id == id)) return;
            ScoreEntry savedEntry = new ScoreEntry
            {
                id = id, name = entry.name.Trim(), coins = entry.coins, skin = entry.skin,
                level = entry.level, completed = entry.completed,
                createdAt = DateTimeOffset.UtcNow.ToString("o", CultureInfo.InvariantCulture)
            };
            entries.Add(savedEntry);
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            string temporary = path + ".tmp";
            File.WriteAllText(temporary, new JavaScriptSerializer().Serialize(entries), new UTF8Encoding(false));
            if (File.Exists(path)) File.Replace(temporary, path, null);
            else File.Move(temporary, path);
        }
    }
}
