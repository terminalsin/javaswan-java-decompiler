package dev.sim0n.iridium.math.statistic.function.impl;

public class Kurtosis extends dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction {
  private final dev.sim0n.iridium.math.statistic.function.StatisticFunction m1;
  private final dev.sim0n.iridium.math.statistic.function.StatisticFunction m2;
  
  public Kurtosis() {
    this.m1 = new Mean();
    this.m2 = new Variance();
  }
  
  public double evaluate(double[] data) {
    double n = (double) data.length;
    if (Double.compare(n, 4) >= 0) {
      mean = this.m1.evaluate(data);
      stdDev = Math.sqrt(this.m2.evaluate(data, mean));
      quarticDeltaSum = java.util.Arrays.stream(data).map(arg -> this.quartic(value - mean)).sum();
      kurtosis = n * (n + 1) / (n - 1) / (n - 2) / (n - 3);
      kurtosis *= quarticDeltaSum / this.quartic(stdDev);
      kurtosis -= 3 * this.square(n - 1) / (n * (n - 3) - 2 * (n - 3));
      return kurtosis;
    } else {
      return NaN;
    }
  }
}