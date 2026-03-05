package dev.sim0n.iridium.math.statistic.function.impl;

import dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction;
import dev.sim0n.iridium.math.statistic.function.StatisticFunction;
import java.util.Arrays;

public class Skewness extends AbstractStatisticFunction {
  private final StatisticFunction m1;
  private final StatisticFunction m2;

  public Skewness() {
    this.m1 = new Mean();
    this.m2 = new Variance();
  }

  public double evaluate(double[] data) {
    double n = (double) data.length;
    if (Double.compare(n, 3) >= 0) {
      double mean = this.m1.evaluate(data);
      double variance = this.m2.evaluate(data, mean);
      double stdDev = Math.sqrt(variance);
      double cubicDeltaSum =
          Arrays.stream(data).map(arg -> this.cube(value - mean)).sum();
      double skewness = n / (n - 1) / (n - 2);
      skewness *= cubicDeltaSum / (variance * stdDev);
      return skewness;
    } else {
      return NaN;
    }
  }
}
