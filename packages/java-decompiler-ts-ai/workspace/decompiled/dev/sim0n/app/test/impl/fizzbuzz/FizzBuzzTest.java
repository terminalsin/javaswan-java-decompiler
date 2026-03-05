package dev.sim0n.app.test.impl.fizzbuzz;

public class FizzBuzzTest implements dev.sim0n.app.test.Test {
  public void run() {
    codes.som.oof4j.fizzbuzz.enterprise.EnterpriseFizzBuzzExecutionEnvironment.getInstance().setIterations(2);
    Runnable task = codes.som.oof4j.fizzbuzz.enterprise.computation.EnterpriseFizzBuzzComputationFactory.buildComputationTask();
    (codes.som.oof4j.fizzbuzz.enterprise.results.FizzBuzzResultPublisher) task.registerSubscriber(new codes.som.oof4j.fizzbuzz.enterprise.EnterpriseFizzBuzzCommandLineResultSubscriber());
    task.run();
  }
}