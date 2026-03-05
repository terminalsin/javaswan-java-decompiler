package dev.sim0n.iridium.math.statistic.function.impl;

public class Skewness extends dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction {
  private final dev.sim0n.iridium.math.statistic.function.StatisticFunction m1;
  private final dev.sim0n.iridium.math.statistic.function.StatisticFunction m2;
  
  public Skewness() {
    this.m1 = new Mean();
    this.m2 = new Variance();
  }
  
  public double evaluate(double[] data) {
    double n = (double) data.length;
    if (Double.compare(n, 3) >= 0) {
      mean = this.m1.evaluate(data);
      variance = this.m2.evaluate(data, mean);
      stdDev = Math.sqrt(variance);
      cubicDeltaSum = java.util.Arrays.stream(data).map(arg -> this.cube(value - mean)).sum();
      skewness = n / (n - 1) / (n - 2);
      skewness *= cubicDeltaSum / (variance * stdDev);
      return skewness;
    } else {
      return NaN;
    }
  }
}