package dev.sim0n.iridium.math.statistic.function.impl;

import dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction;
import dev.sim0n.iridium.math.statistic.function.StatisticFunction;
import dev.sim0n.iridium.math.statistic.function.impl.Mean;
import dev.sim0n.iridium.math.statistic.function.impl.Variance;
import java.util.Arrays;

public class Skewness extends AbstractStatisticFunction {
  private final StatisticFunction m1 = new Mean();
  private final StatisticFunction m2 = new Variance();

  @Override
  public double evaluate(double[] data) {
    double n = data.length;
    if (n < 3.0) {
      return Double.NaN;
    }
    double mean = this.m1.evaluate(data);
    double variance = this.m2.evaluate(data, mean);
    double stdDev = Math.sqrt(variance);
    double cubicDeltaSum =
        Arrays.stream(data).map(value -> this.cube(value - mean)).sum();
    double skewness = n / (n - 1.0) / (n - 2.0);
    return skewness *= cubicDeltaSum / (variance * stdDev);
  }
}
