package dev.sim0n.iridium.math.statistic.function;

import java.util.Collection;
import java.util.List;

public interface StatisticFunction {
  public double evaluate(double[] var1);

  public default double evaluate(Collection<? extends Number> data) {
    return this.evaluate(data.stream().mapToDouble(Number::doubleValue).toArray());
  }

  public default double evaluate(double[] data, double mean) {
    throw new UnsupportedOperationException("Found no implementation for this method!");
  }

  public default boolean test(double[] data, double threshold) {
    return this.evaluate(data) > threshold;
  }

  public default boolean test(List<? extends Number> data, double threshold) {
    return this.test(data.stream().mapToDouble(Number::doubleValue).toArray(), threshold);
  }
}
