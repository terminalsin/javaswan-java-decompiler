package dev.sim0n.iridium.math.statistic.function.impl;

import java.util.Arrays;
import dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction;

public class Max extends AbstractStatisticFunction {
  @Override
  public double evaluate(final double[] data) {
    return Arrays.stream(data).max().orElse(Double.NaN);
  }
}
