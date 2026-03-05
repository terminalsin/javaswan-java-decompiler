package dev.sim0n.iridium.math.statistic.function.impl;

import dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction;
import dev.sim0n.iridium.math.statistic.function.StatisticFunction;

public class StandardDeviation extends AbstractStatisticFunction {
  private final StatisticFunction m2;
  
  public StandardDeviation() {
    this.m2 = new Variance();
  }
  
  public double evaluate(double[] data) {
    return this.sqrt(this.m2.evaluate(data));
  }
}