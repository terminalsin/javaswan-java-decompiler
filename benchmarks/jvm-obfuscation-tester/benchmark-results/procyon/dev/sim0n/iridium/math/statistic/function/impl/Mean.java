package dev.sim0n.iridium.math.statistic.function.impl;

import dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction;

public class Mean extends AbstractStatisticFunction {
  @Override
  public double evaluate(final double[] data) {
    final int n = data.length;
    double mean = new Sum().evaluate(data);
    mean /= n;
    return mean;
  }
}
