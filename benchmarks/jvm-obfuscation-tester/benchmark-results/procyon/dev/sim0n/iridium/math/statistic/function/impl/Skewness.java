package dev.sim0n.iridium.math.statistic.function.impl;

import java.util.Arrays;
import dev.sim0n.iridium.math.statistic.function.StatisticFunction;
import dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction;

public class Skewness extends AbstractStatisticFunction {
  private final StatisticFunction m1;
  private final StatisticFunction m2;

  public Skewness() {
    this.m1 = new Mean();
    this.m2 = new Variance();
  }

  @Override
  public double evaluate(final double[] data) {
    final double n = data.length;
    if (n < 3.0) {
      return Double.NaN;
    }
    final double mean = this.m1.evaluate(data);
    final double variance = this.m2.evaluate(data, mean);
    final double stdDev = Math.sqrt(variance);
    final double cubicDeltaSum =
        Arrays.stream(data).map(value -> this.cube(value - mean)).sum();
    double skewness = n / (n - 1.0) / (n - 2.0);
    skewness *= cubicDeltaSum / (variance * stdDev);
    return skewness;
  }
}
