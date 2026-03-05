package dev.sim0n.iridium.math.statistic.function.impl;

public class Range extends dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction {
  public double evaluate(double[] data) {
    double max = new Max().evaluate(data);
    double min = new Min().evaluate(data);
    return max - min;
  }
}