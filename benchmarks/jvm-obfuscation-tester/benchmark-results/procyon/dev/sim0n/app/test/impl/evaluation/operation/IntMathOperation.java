package dev.sim0n.app.test.impl.evaluation.operation;

public enum IntMathOperation {
  ADD("+") {
    @Override
    public int evaluate(final int first, final int second) {
      return first + second;
    }
  },
  SUB("-") {
    @Override
    public int evaluate(final int first, final int second) {
      return first - second;
    }
  },
  DIV("/") {
    @Override
    public int evaluate(final int first, final int second) {
      return first / second;
    }
  },
  REM("%") {
    @Override
    public int evaluate(final int first, final int second) {
      return first % second;
    }
  },
  MUL("*") {
    @Override
    public int evaluate(final int first, final int second) {
      return first * second;
    }
  },
  XOR("^") {
    @Override
    public int evaluate(final int first, final int second) {
      return first ^ second;
    }
  };

  private final String desc;

  public abstract int evaluate(final int p0, final int p1);

  public String getDesc() {
    return this.desc;
  }

  private IntMathOperation(final String desc) {
    this.desc = desc;
  }
}
