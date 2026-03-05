package dev.sim0n.iridium.math.statistic.function.impl;

import dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction;

public class Mean extends AbstractStatisticFunction {
  public double evaluate(double[] data) {
    int n = data.length;
    double mean = new Sum().evaluate(data);
    mean /= (double) n;
    return mean;
  }
}