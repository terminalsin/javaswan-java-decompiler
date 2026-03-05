package dev.sim0n.iridium.math.statistic.function.impl;

public class StandardDeviation extends dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction {
  private final dev.sim0n.iridium.math.statistic.function.StatisticFunction m2;
  
  public StandardDeviation() {
    this.m2 = new Variance();
  }
  
  public double evaluate(double[] data) {
    return this.sqrt(this.m2.evaluate(data));
  }
}