package dev.sim0n.iridium.math.statistic.function.impl;

import dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction;
import dev.sim0n.iridium.math.statistic.function.impl.Sum;

public class Mean extends AbstractStatisticFunction {
  @Override
  public double evaluate(double[] data) {
    int n = data.length;
    double mean = new Sum().evaluate(data);
    return mean /= (double) n;
  }
}
