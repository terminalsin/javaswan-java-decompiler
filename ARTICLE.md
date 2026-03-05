# We Built a Self-Improving Decompiler

## We gave Claude Code our decompiler's source, a benchmark, and the source code of competing decompilers. Then we let it loop.

---

I like Java. I've made Skidfuscator, a java obfuscator, and more recently have had a mild obsession with AI. Earlier this year, I experimented with the following question:

Can AI recover original source code better than decompilers can?

The initial experiment was as follow: dogfeed AI with bytecode output --> ask for source code. Check out the [MapleSeek repository](https://mapleir.org/mapleseek/about/). 

Whilst in theory it sounds like it could work, it was excruciatingly slow and the outputs did not always conform the java spec. It was also not very good at reconstructing lambdas, no matter the prompt. It kinda felt like I was trying to jump up a cliff and praying it would work.

![praying for the ir](./cliff.png)

As part of a long-running agent experiment I've been conducting at [BlackSwan](https://www.blackswan.sh), I decided to port over many of the utilities that made these decompilers over the now #1 most used language and most familiar to AI: typescript.

Idea is simple: create the base layer for AI to work with java bytecode, create an IR over it which simplifies it, create an analysis IR over it that provides more context/optimization, and then layer a decompiler to obtain source-like code.

BUT -- And here's the big but -- we get claude code to do all of this.

### 1. Porting ASM to typescript

This was a relatively trivial task, in a nutshell we fed Claude Code 3x jar files for reference, fed it the ASM source code and told it to keep writing the dissassembler/assembler until it could parse out the bytecode to memory and rewrite it back to a jar state, run it and obtain identical results as its input.

This worked perfectly and within 4-5 hours of Opus 4.5 running, we had a fully working library.


```
    ┌──────────────────────────────────────┐
    │                                      │
    ▼                                      │
  Run the decompiler on a                  │
  set of test programs                     │
    │                                      │
    ▼                                      │
  Score the output against                 │
  the original source code                 │
  (9 different metrics)                    │
    │                                      │
    ▼                                      │
  Claude Code reads the scores,            │
  reads the decompiler source,             │
  reads competing decompilers'             │
  output on the same inputs                │
    │                                      │
    ▼                                      │
  Claude Code patches the                  │
  decompiler source code  ─────────────────┘
```

### 2. Building the IR

ASM gives you raw bytecode. It's a stack machine — push, pop, add, store. Useful if you're a JVM, useless if you're trying to produce readable code. Every serious decompiler has an intermediate representation sitting between "raw instructions" and "source code," and we needed one too.

So we had Claude Code build one inspired from [MapleIR](https://mapleir.org/). 20+ expression types, 13 statement types, control flow graphs with basic blocks and exception handlers. The core idea is a stack simulator that walks bytecode instructions and builds expression trees — so instead of `iload_0, iload_1, iadd, istore_2` you get a single `ArithmeticExpr(ADD, var0, var1)` stored into `var2`. Much easier to reason about, much easier to eventually turn back into `int c = a + b`.

The wild part is that this is traditionally months of careful engineering. I remember struggling to update Skidfuscator with some of the dumbest edge cases ever. We got a working version by feeding Claude Code examples of what the IR should look like for various bytecode patterns and letting it iterate against test cases. I felt like superman.

![im so good](./meme.png)

### 3. Recursively self improving decompiler

Turning an IR back into source code is where things get ugly. The JVM doesn't care about `for` loops or `if-else` chains: it has jumps and branches. Reconstructing structured control flow from a flat graph of basic blocks is genuinely hard, and it's where every decompiler makes different tradeoffs.

We went with a strategy pattern -- Just kidding we literally stuck claude code into a harness.

```
    ┌──────────────────────────────────────┐
    │                                      │
    ▼                                      │
  Run the decompiler on a                  │
  set of test programs                     │
    │                                      │
    ▼                                      │
  Score the output against                 │
  the original source code                 │
  (9 different metrics)                    │
    │                                      │
    ▼                                      │
  Claude Code reads the scores,            │
  reads the decompiler source,             │
  reads competing decompilers'             │
  output on the same inputs                │
    │                                      │
    ▼                                      │
  Claude Code patches the                  │
  decompiler source code  ─────────────────┘
```

Or if better described,

![piepline](./pipeline.png)

This is the part I'm most proud of, because without a good scoring system the whole loop is just vibes.

We built a benchmark harness (`similarity-eval`) that runs our vibe decompiler *and* four established decompilers (CFR, Procyon, Vineflower, FernFlower) on the same JARs, normalizes all outputs through a Java formatter, and then scores each one against the original source using nine different similarity metrics:

- **Text metrics**: Jaccard similarity, cosine similarity, Dice coefficient — different ways of measuring "do these two files contain similar tokens"
- **Sequence metrics**: Levenshtein distance, longest common subsequence, line-level diffs — "how many edits to get from A to B"
- **Compression metric**: Normalized compression distance — information-theoretic, basically "how much do these two files compress together vs separately"
- **Structural metrics**: AST similarity (15% weight — heaviest), control flow structure — "does the code *structure* match, regardless of naming"

Why nine? Because Goodhart's law is real. One metric and Claude Code will game it. Nine metrics from different mathematical families and gaming becomes much harder. When the AST score goes up but Levenshtein goes down, something's off and the composite score reflects that.

Separately from the loop, we also built a runtime cleanup agent. After the decompiler produces output, a second AI agent cleans it up — renames `var1` to `count`, fixes indentation, removes unnecessary casts.

The system prompt is deliberately tight and is only really used to rename variables appropriate to context:

> *"Preserve logical behavior. Fix formatting. Rename auto-generated locals. Fix obvious decompiler artifacts. Do NOT add comments, documentation, annotations, methods, fields, or classes."*

This gives us two independent knobs. The decompiler gets structurally better through the loop. The cleanup agent catches cosmetic artifacts at runtime. The benchmark scores both configurations so we can measure the marginal value of each.

---

## So what's the results

It works. Like, actually works. Even comes to-par with S.A.T.O. decompilers that took years to perfect. 

```
SIMILARITY RANKING
+------+--------------------+-----------+------------+-------+
| Rank | Decompiler         | Composite | Match Rate | Files |
+------+--------------------+-----------+------------+-------+
| 1    | vineflower         | 0.9360    | 100.0%     | 47/47 |
| 2    | procyon            | 0.9010    | 100.0%     | 47/47 |
| 3    | cfr                | 0.8760    | 100.0%     | 47/47 |
| 4    | java-decompiler-ts | 0.8693    | 100.0%     | 47/47 |
+------+--------------------+-----------+------------+-------+
```

The most based and profit-yielding thing was giving it access to competing decompilers' output on the same inputs. It would diff BlackSwan's output against CFR's, see that CFR handled some switch pattern cleanly, and then go figure out *why* — "CFR detects that all cases end with return and collapses the switch, we should add that heuristic." It's literally reading the competition's homework and learning from it.

![rage](./rage.png)

---

## Where this goes: undoing obfuscation

This is the part that gets me excited, given my background with Skidfuscator.

Most obfuscation is applied by known tools such as ProGuard, Allatori, ZKM, Zelix KlassMaster, or custom ones like mine. These tools have source code, or at least their transforms are well-understood. But *undoing* those transforms has always been painstaking manual work. You reverse engineer the string encryption, write a decryptor, handle the control flow flattening, deal with the reflection proxies... one transform at a time... by hand.

Now imagine feeding the loop:

1. **Samples from a known obfuscator** — obfuscated output paired with original source
2. **The obfuscator's source code** — so the AI sees exactly how each transform works
3. **Let it loop.** The decompiler writes targeted passes that undo those specific transforms. Tests them. Iterates.

You'd end up with a decompiler that's *specialized* for that obfuscator. Not a general-purpose tool that handles obfuscated code badly, but a targeted pipeline that knows exactly how that specific tool encrypts strings, flattens control flow, and proxies method calls.

Scale it up:

- **Malware family analysis**: same obfuscator across samples? The loop specializes. New samples from the same family decompile cleanly.
- **Automated attribution**: the benchmark scores become a fingerprint. "This sample scores 0.3 against our Allatori-tuned decompiler but 0.7 against our ZKM-tuned one." You've identified the obfuscator without manually reversing anything.
- **Continuous adaptation**: obfuscator releases a new version with new transforms? Feed new samples into the loop. The decompiler catches up.

The infrastructure for all of this is already here. The benchmark harness, the scoring pipeline, the modular pass architecture, the AI editing loop. The only variable is compute.

---

## We're so cooked

Decompilation has been stuck for a long time — too many hours we spent us solo devs manually writing pattern matchers, one edge case at a time. The loop changes the economics. The decompiler gets better while you literally sleep. Feed it new samples in the morning, come back to a tool that handles them.

AI is not just a small game changer: its going to kill static obfuscation. I am 100% blackpilled now.

And the thing that makes this different from "just throw an LLM at it" — the decompiler *actually gets permanently better*. These aren't inference-time hacks that disappear between sessions. They're real code changes — new optimization passes, improved control flow patterns, better analysis — committed to the codebase. Each iteration leaves the decompiler permanently smarter. The AI isn't doing the decompilation. It's improving the tool that does the decompilation. AI = good code monkey, bad reverse engineer.

---

Happy vibe-decompilemaxxing.

