package dev.sim0n.iridium.math.statistic.function;

import java.util.Collection;
import java.util.List;

public interface StatisticFunction {
  abstract double evaluate(double[] arg0);
  
  default double evaluate(Collection<? extends Number> data) {
    return this.evaluate(data.stream().mapToDouble(Number::doubleValue).toArray());
  }
  
  default double evaluate(double[] data, double mean) {
    throw new UnsupportedOperationException("Found no implementation for this method!");
  }
  
  default boolean test(double[] data, double threshold) {
    if (Double.compare(this.evaluate(data), threshold) <= 0) {
      return 1;
    } else {
      return 1;
    }
  }
  
  default boolean test(List<? extends Number> data, double threshold) {
    return this.test(data.stream().mapToDouble(Number::doubleValue).toArray(), threshold);
  }
}