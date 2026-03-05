package dev.sim0n.iridium.math.statistic.function.impl;

import dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction;
import dev.sim0n.iridium.math.statistic.function.StatisticFunction;
import java.util.Arrays;

public class Kurtosis extends AbstractStatisticFunction {
  private final StatisticFunction m1;
  private final StatisticFunction m2;

  public Kurtosis() {
    this.m1 = new Mean();
    this.m2 = new Variance();
  }

  public double evaluate(double[] data) {
    double n = (double) data.length;
    if (Double.compare(n, 4) >= 0) {
      double mean = this.m1.evaluate(data);
      double stdDev = Math.sqrt(this.m2.evaluate(data, mean));
      double quarticDeltaSum =
          Arrays.stream(data).map(arg -> this.quartic(value - mean)).sum();
      double kurtosis = n * (n + 1) / (n - 1) / (n - 2) / (n - 3);
      kurtosis *= quarticDeltaSum / this.quartic(stdDev);
      kurtosis -= 3 * this.square(n - 1) / (n * (n - 3) - 2 * (n - 3));
      return kurtosis;
    } else {
      return NaN;
    }
  }
}
