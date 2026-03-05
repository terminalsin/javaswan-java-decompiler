package dev.sim0n.app.test.impl.evaluation;

public class EvaluationTest implements dev.sim0n.app.test.Test {
  private static final java.security.SecureRandom RANDOM;
  
  public void run() {
    System.out.println("Running evaluation test");
    java.util.function.Supplier randomInt = () -> 1 + RANDOM.nextInt(20);
    java.util.function.Supplier randomIntMathOp = () -> RANDOM.nextInt(dev.sim0n.app.test.impl.evaluation.operation.IntMathOperation.values().length);
    java.util.List evaluations = (java.util.List) java.util.stream.Stream.generate(() -> new dev.sim0n.app.test.impl.evaluation.Evaluation((Number) randomInt.get(), (Number) randomInt.get(), arg -> {
    dev.sim0n.app.test.impl.evaluation.operation.IntMathOperation op = dev.sim0n.app.test.impl.evaluation.operation.IntMathOperation.values()[RANDOM.nextInt(dev.sim0n.app.test.impl.evaluation.operation.IntMathOperation.values().length)];
    int first = (Integer) randomInt.get().intValue();
    int second = (Integer) randomInt.get().intValue();
    System.out.println(new StringBuilder().append(first).append(" ").append(op.getDesc()).append(" ").append(second).append(" = ").append(op.evaluate(first, second)).toString());
})).limit(5).collect(java.util.stream.Collectors.toList());
    evaluations.forEach(arg -> arg.getEvaluator().accept(randomIntMathOp.get()));
    System.out.println("Finished evaluation test");
  }
  
  static {
    RANDOM = new java.security.SecureRandom();
  }
}