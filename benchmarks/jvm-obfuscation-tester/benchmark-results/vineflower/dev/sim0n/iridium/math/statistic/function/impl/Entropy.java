package dev.sim0n.iridium.math.statistic.function.impl;

import dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction;
import java.util.HashMap;
import java.util.Map;

public class Entropy extends AbstractStatisticFunction {
  private static final double LN_2 = Math.log(2.0);

  @Override
  public double evaluate(double[] data) {
    double n = data.length;
    if (n < 3.0) {
      return Double.NaN;
    } else {
      Map<Double, Integer> valueCounts = new HashMap<>();

      for (double value : data) {
        valueCounts.put(value, valueCounts.computeIfAbsent(value, k -> 0) + 1);
      }

      double entropy = valueCounts.values().stream()
          .mapToDouble(freq -> freq.intValue() / n)
          .map(probability -> probability * (Math.log(probability) / LN_2))
          .sum();
      return -entropy;
    }
  }
}
