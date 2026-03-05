package dev.sim0n.iridium.math.statistic.function.impl;

import dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction;

public class Range extends AbstractStatisticFunction {
  @Override
  public double evaluate(double[] data) {
    double max = new Max().evaluate(data);
    double min = new Min().evaluate(data);
    return max - min;
  }
}
