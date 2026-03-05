package dev.sim0n.iridium.math.statistic.function.impl;

public class Max extends dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction {
  public double evaluate(double[] data) {
    return java.util.Arrays.stream(data).max().orElse(NaN);
  }
}