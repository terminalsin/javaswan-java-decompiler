package dev.sim0n.iridium.math.statistic.function.impl;

import java.util.Map;
import java.util.HashMap;
import dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction;

public class Entropy extends AbstractStatisticFunction {
  private static final double LN_2;

  @Override
  public double evaluate(final double[] data) {
    final double n = data.length;
    if (n < 3.0) {
      return Double.NaN;
    }
    final Map<Double, Integer> valueCounts = new HashMap<Double, Integer>();
    for (final double value : data) {
      valueCounts.put(value, valueCounts.computeIfAbsent(value, k -> 0) + 1);
    }
    double entropy = valueCounts.values().stream()
        .mapToDouble(freq -> freq / n)
        .map(probability -> probability * (Math.log(probability) / Entropy.LN_2))
        .sum();
    entropy = -entropy;
    return entropy;
  }

  static {
    LN_2 = Math.log(2.0);
  }
}
