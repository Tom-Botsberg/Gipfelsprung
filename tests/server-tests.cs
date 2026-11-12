using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;

internal static class ServerTests
{
    private static int passed;
    private static int failed;

    private static void Assert(bool value, string message)
    {
        if (!value) throw new InvalidOperationException(message);
    }

    private static ScoreEntry Entry(int coins = 10)
    {
        return new ScoreEntry { id = Guid.NewGuid().ToString(), name = "Maurin", coins = coins, skin = 3, level = 1 };
    }

    private static void Test(string name, Action<string> action)
    {
        string root = Path.Combine(Path.GetTempPath(), "Gipfelsprung-test-" + Guid.NewGuid());
        Directory.CreateDirectory(root);
        string path = Path.Combine(root, "scores.json");
        try { action(path); passed++; Console.WriteLine("OK - " + name); }
        catch (Exception error) { failed++; Console.Error.WriteLine("FAIL - " + name + ": " + error.Message); }
        finally
        {
            foreach (string file in new[] { path, path + ".tmp" })
                if (File.Exists(file)) { File.SetAttributes(file, FileAttributes.Normal); File.Delete(file); }
            Directory.Delete(root);
        }
    }

    private static int Main()
    {
        Test("A new leaderboard is empty", path => Assert(new ScoreStore(path).ReadTop().Count == 0, "Expected empty list."));
        Test("Scores survive a fresh store instance and preserve Unicode names", path =>
        {
            ScoreEntry entry = Entry(42); entry.name = "  Nici \u00c4lpler  ";
            new ScoreStore(path).Save(entry);
            ScoreEntry saved = new ScoreStore(path).ReadTop().Single();
            Assert(saved.name == "Nici \u00c4lpler" && saved.coins == 42 && saved.createdAt != null, "Score was not persisted correctly.");
        });
        Test("The top ten are sorted by coins", path =>
        {
            ScoreStore store = new ScoreStore(path);
            for (int n = 0; n < 15; n++) store.Save(Entry(n * 7));
            List<ScoreEntry> scores = store.ReadTop();
            Assert(scores.Count == 10 && scores[0].coins == 98 && scores[9].coins == 35, "Incorrect ranking.");
        });
        Test("Retrying a run cannot create a duplicate or change its result", path =>
        {
            ScoreStore store = new ScoreStore(path); ScoreEntry entry = Entry(20); store.Save(entry);
            entry.coins = 99; store.Save(entry);
            List<ScoreEntry> scores = new ScoreStore(path).ReadTop();
            Assert(scores.Count == 1 && scores[0].coins == 20, "Run was duplicated or changed.");
        });
        Test("All five skins and the final victory can be saved", path =>
        {
            ScoreStore store = new ScoreStore(path);
            for (int skin = 0; skin < 5; skin++)
            {
                ScoreEntry entry = Entry(100 + skin); entry.skin = skin; entry.level = 5; entry.completed = true; store.Save(entry);
            }
            Assert(store.ReadTop().Count == 5 && store.ReadTop().All(entry => entry.completed), "Missing skins or victories.");
        });
        Test("Invalid submissions are rejected without creating a score file", path =>
        {
            ScoreEntry[] invalid = { Entry(), Entry(), Entry(), Entry(), Entry(), Entry(), Entry(), Entry(), Entry() };
            invalid[0].id = "invalid"; invalid[1].name = " "; invalid[2].name = new string('x', 25);
            invalid[3].name = "Name\n"; invalid[4].coins = -1; invalid[5].skin = 5;
            invalid[6].level = 0; invalid[7].completed = true; invalid[8].coins = 100001;
            foreach (ScoreEntry entry in invalid)
            {
                bool rejected = false;
                try { new ScoreStore(path).Save(entry); } catch (ArgumentException) { rejected = true; }
                Assert(rejected, "Invalid score accepted.");
            }
            Assert(!File.Exists(path), "Invalid requests created a file.");
        });
        Test("Corrupted score files fail explicitly and are never overwritten", path =>
        {
            File.WriteAllText(path, "{broken");
            bool readFailed = false, writeFailed = false;
            try { new ScoreStore(path).ReadTop(); } catch (ArgumentException) { readFailed = true; }
            try { new ScoreStore(path).Save(Entry()); } catch (ArgumentException) { writeFailed = true; }
            Assert(readFailed && writeFailed && File.ReadAllText(path) == "{broken", "Corruption was hidden or overwritten.");
        });
        Test("Null data and invalid timestamps are rejected explicitly", path =>
        {
            foreach (string content in new[] { "null", new System.Web.Script.Serialization.JavaScriptSerializer().Serialize(new[] { Entry() }) })
            {
                File.WriteAllText(path, content);
                bool rejected = false;
                try { new ScoreStore(path).ReadTop(); } catch (InvalidDataException) { rejected = true; }
                Assert(rejected && File.ReadAllText(path) == content, "Invalid stored data was hidden or changed.");
            }
        });
        Test("Concurrent saves do not lose scores and commit atomically", path =>
        {
            ScoreStore store = new ScoreStore(path);
            List<Exception> errors = new List<Exception>();
            Thread[] threads = Enumerable.Range(1, 24).Select(n => new Thread(() =>
            {
                try { store.Save(Entry(n)); } catch (Exception error) { lock (errors) errors.Add(error); }
            })).ToArray();
            foreach (Thread thread in threads) thread.Start();
            foreach (Thread thread in threads) thread.Join();
            Assert(errors.Count == 0, "Concurrent save failed.");
            Assert(new ScoreStore(path).ReadTop().First().coins == 24, "Missing highest score.");
            Assert(new System.Web.Script.Serialization.JavaScriptSerializer().Deserialize<List<ScoreEntry>>(File.ReadAllText(path)).Count == 24, "A concurrent write was lost.");
            Assert(!File.Exists(path + ".tmp"), "Temporary file was not committed.");
        });
        Console.WriteLine(passed + " passed, " + failed + " failed.");
        return failed == 0 ? 0 : 1;
    }
}
