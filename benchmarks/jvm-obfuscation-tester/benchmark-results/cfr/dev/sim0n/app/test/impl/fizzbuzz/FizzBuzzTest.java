package dev.sim0n.app.test.impl.fizzbuzz;

import codes.som.oof4j.fizzbuzz.enterprise.EnterpriseFizzBuzzCommandLineResultSubscriber;
import codes.som.oof4j.fizzbuzz.enterprise.EnterpriseFizzBuzzExecutionEnvironment;
import codes.som.oof4j.fizzbuzz.enterprise.computation.EnterpriseFizzBuzzComputationFactory;
import codes.som.oof4j.fizzbuzz.enterprise.computation.EnterpriseFizzBuzzComputationTask;
import codes.som.oof4j.fizzbuzz.enterprise.results.FizzBuzzResultPublisher;
import dev.sim0n.app.test.Test;

public class FizzBuzzTest implements Test {
  @Override
  public void run() {
    EnterpriseFizzBuzzExecutionEnvironment.getInstance().setIterations(2);
    EnterpriseFizzBuzzComputationTask task =
        EnterpriseFizzBuzzComputationFactory.buildComputationTask();
    ((FizzBuzzResultPublisher) task)
        .registerSubscriber(new EnterpriseFizzBuzzCommandLineResultSubscriber(System.out));
    task.run();
  }
}
