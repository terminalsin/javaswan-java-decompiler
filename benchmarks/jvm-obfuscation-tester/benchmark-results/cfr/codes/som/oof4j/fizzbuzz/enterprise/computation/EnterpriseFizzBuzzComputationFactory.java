package codes.som.oof4j.fizzbuzz.enterprise.computation;

import codes.som.oof4j.fizzbuzz.enterprise.EnterpriseFizzBuzzExecutionEnvironment;
import codes.som.oof4j.fizzbuzz.enterprise.computation.EnterpriseFizzBuzzComputationTask;

public class EnterpriseFizzBuzzComputationFactory {
  public static EnterpriseFizzBuzzComputationTask buildComputationTask() {
    return new EnterpriseFizzBuzzComputationTask(
        EnterpriseFizzBuzzExecutionEnvironment.getInstance().getIterations());
  }
}
