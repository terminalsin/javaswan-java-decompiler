package dev.sim0n.app.test.impl.evaluation.operation;

public enum IntMathOperation {
  ADD("+") {

    @Override
    public int evaluate(int first, int second) {
      return first + second;
    }
  },
  SUB("-") {

    @Override
    public int evaluate(int first, int second) {
      return first - second;
    }
  },
  DIV("/") {

    @Override
    public int evaluate(int first, int second) {
      return first / second;
    }
  },
  REM("%") {

    @Override
    public int evaluate(int first, int second) {
      return first % second;
    }
  },
  MUL("*") {

    @Override
    public int evaluate(int first, int second) {
      return first * second;
    }
  },
  XOR("^") {

    @Override
    public int evaluate(int first, int second) {
      return first ^ second;
    }
  };

  private final String desc;

  public abstract int evaluate(int var1, int var2);

  public String getDesc() {
    return this.desc;
  }

  private IntMathOperation(String desc) {
    this.desc = desc;
  }
}
