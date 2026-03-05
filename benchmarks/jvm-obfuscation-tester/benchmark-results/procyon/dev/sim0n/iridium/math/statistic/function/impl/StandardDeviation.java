package dev.sim0n.iridium.math.statistic.function.impl;

import dev.sim0n.iridium.math.statistic.function.StatisticFunction;
import dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction;

public class StandardDeviation extends AbstractStatisticFunction {
  private final StatisticFunction m2;

  public StandardDeviation() {
    this.m2 = new Variance();
  }

  @Override
  public double evaluate(final double[] data) {
    return this.sqrt(this.m2.evaluate(data));
  }
}
