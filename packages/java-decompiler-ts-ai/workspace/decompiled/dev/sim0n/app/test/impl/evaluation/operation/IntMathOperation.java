package dev.sim0n.app.test.impl.evaluation.operation;

public enum IntMathOperation {
  ADD("+") {
    public int evaluate(int first, int second) {
      return first + second;
    }
  },
  SUB("-") {
    public int evaluate(int first, int second) {
      return first - second;
    }
  },
  DIV("/") {
    public int evaluate(int first, int second) {
      return first / second;
    }
  },
  REM("%") {
    public int evaluate(int first, int second) {
      return first % second;
    }
  },
  MUL("*") {
    public int evaluate(int first, int second) {
      return first * second;
    }
  },
  XOR("^") {
    public int evaluate(int first, int second) {
      return first ^ second;
    }
  };
  
  private final String desc;
  
  public abstract int evaluate(int arg0, int arg1);
  
  public String getDesc() {
    return this.desc;
  }
  
  IntMathOperation(String desc) {
    this.desc = desc;
  }
}