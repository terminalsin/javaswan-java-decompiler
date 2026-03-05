package dev.sim0n.app.test.impl.evaluation;

import java.util.function.Supplier;
import java.util.stream.Collector;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.List;
import dev.sim0n.app.test.impl.evaluation.operation.IntMathOperation;
import java.security.SecureRandom;
import dev.sim0n.app.test.Test;

public class EvaluationTest implements Test {
  private static final SecureRandom RANDOM;

  @Override
  public void run() {
    System.out.println("Running evaluation test");
    final Supplier<Integer> randomInt = () -> 1 + EvaluationTest.RANDOM.nextInt(20);
    final Supplier<Integer> randomIntMathOp =
        () -> EvaluationTest.RANDOM.nextInt(IntMathOperation.values().length);
    final List<Evaluation<Integer>> evaluations = Stream.generate(() ->
            new Evaluation(randomInt.get(), randomInt.get(), n -> {
              final IntMathOperation op = IntMathOperation.values()[
                  EvaluationTest.RANDOM.nextInt(IntMathOperation.values().length)];
              final int first = randomInt.get();
              final int second = randomInt.get();
              System.out.println(
                  first + " " + op.getDesc() + " " + second + " = " + op.evaluate(first, second));
              return;
            }))
        .limit(5L)
        .collect((Collector<? super Object, ?, List<Evaluation<Integer>>>) Collectors.toList());
    evaluations.forEach(e -> e.getEvaluator().accept(randomIntMathOp.get()));
    System.out.println("Finished evaluation test");
  }

  static {
    RANDOM = new SecureRandom();
  }
}
