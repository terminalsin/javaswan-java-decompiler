package dev.sim0n.iridium.math.statistic.function.impl;

import java.util.Arrays;
import dev.sim0n.iridium.math.statistic.function.StatisticFunction;
import dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction;

public class Kurtosis extends AbstractStatisticFunction {
  private final StatisticFunction m1;
  private final StatisticFunction m2;

  public Kurtosis() {
    this.m1 = new Mean();
    this.m2 = new Variance();
  }

  @Override
  public double evaluate(final double[] data) {
    final double n = data.length;
    if (n < 4.0) {
      return Double.NaN;
    }
    final double mean = this.m1.evaluate(data);
    final double stdDev = Math.sqrt(this.m2.evaluate(data, mean));
    final double quarticDeltaSum =
        Arrays.stream(data).map(value -> this.quartic(value - mean)).sum();
    double kurtosis = n * (n + 1.0) / (n - 1.0) / (n - 2.0) / (n - 3.0);
    kurtosis *= quarticDeltaSum / this.quartic(stdDev);
    kurtosis -= 3.0 * this.square(n - 1.0) / (n * (n - 3.0) - 2.0 * (n - 3.0));
    return kurtosis;
  }
}
