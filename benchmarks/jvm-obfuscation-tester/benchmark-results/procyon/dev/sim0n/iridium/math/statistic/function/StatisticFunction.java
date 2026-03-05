package dev.sim0n.iridium.math.statistic.function;

import java.util.List;
import java.util.Collection;

public interface StatisticFunction {
  double evaluate(final double[] p0);

  default double evaluate(final Collection<? extends Number> data) {
    return this.evaluate(data.stream().mapToDouble(Number::doubleValue).toArray());
  }

  default double evaluate(final double[] data, final double mean) {
    throw new UnsupportedOperationException("Found no implementation for this method!");
  }

  default boolean test(final double[] data, final double threshold) {
    return this.evaluate(data) > threshold;
  }

  default boolean test(final List<? extends Number> data, final double threshold) {
    return this.test(data.stream().mapToDouble(Number::doubleValue).toArray(), threshold);
  }
}
