# We Built a Self-Improving Decompiler

## We gave Claude Code our decompiler's source, a benchmark, and the source code of competing decompilers. Then we let it loop.

---

I like Java. I've made Skidfuscator, a java obfuscator, and more recently have had a mild obsession with AI. Earlier this year, I experimented with the following question:

Can AI recover original source code better than decompilers can?

The initial experiment was as follow: dogfeed AI with bytecode output --> ask for source code. Check out the [MapleSeek repository](https://mapleir.org/mapleseek/about/). 

Whilst in theory it sounds like it could work, it was excruciatingly slow and the outputs did not always conform the java spec. It was also not very good at reconstructing lambdas, no matter the prompt. It kinda felt like I was trying to jump up a cliff and praying it would work.

![praying for the ir](./image.png)

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
