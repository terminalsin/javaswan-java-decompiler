package dev.sim0n.app.test.impl.evaluation;

import dev.sim0n.app.test.Test;
import java.security.SecureRandom;
import java.util.List;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class EvaluationTest implements Test {
  private static final SecureRandom RANDOM;

  public void run() {
    System.out.println("Running evaluation test");
    Supplier randomInt = () -> 1 + RANDOM.nextInt(20);
    Supplier randomIntMathOp = () -> RANDOM.nextInt(
        dev.sim0n.app.test.impl.evaluation.operation.IntMathOperation.values().length);
    List evaluations =
        (List) Stream.generate(() -> new dev.sim0n.app.test.impl.evaluation.Evaluation(
                (Number) randomInt.get(), (Number) randomInt.get(), arg -> {
                  dev.sim0n.app.test.impl.evaluation.operation.IntMathOperation op =
                      dev.sim0n.app.test.impl.evaluation.operation.IntMathOperation.values()[
                          RANDOM.nextInt(
                              dev.sim0n.app.test.impl.evaluation.operation.IntMathOperation.values()
                                  .length)];
                  int first = (Integer) randomInt.get().intValue();
                  int second = (Integer) randomInt.get().intValue();
                  System.out.println(first + " " + op.getDesc() + " " + second + " = "
                      + op.evaluate(first, second));
                }))
            .limit(5)
            .collect(Collectors.toList());
    evaluations.forEach(arg -> arg.getEvaluator().accept(randomIntMathOp.get()));
    System.out.println("Finished evaluation test");
  }

  static {
    RANDOM = new SecureRandom();
  }
}
