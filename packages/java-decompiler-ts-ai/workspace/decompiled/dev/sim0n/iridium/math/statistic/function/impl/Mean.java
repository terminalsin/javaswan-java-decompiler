package dev.sim0n.iridium.math.statistic.function.impl;

public class Mean extends dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction {
  public double evaluate(double[] data) {
    int n = data.length;
    double mean = new Sum().evaluate(data);
    mean /= (double) n;
    return mean;
  }
}