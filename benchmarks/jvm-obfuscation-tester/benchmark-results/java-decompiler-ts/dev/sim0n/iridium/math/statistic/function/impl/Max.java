package dev.sim0n.iridium.math.statistic.function.impl;

import dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction;
import java.util.Arrays;

public class Max extends AbstractStatisticFunction {
  public double evaluate(double[] data) {
    return Arrays.stream(data).max().orElse(NaN);
  }
}
