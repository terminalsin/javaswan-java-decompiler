package dev.sim0n.iridium.math.statistic.function.impl;

import java.util.stream.IntStream;
import java.util.Arrays;
import dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction;

public class Mode extends AbstractStatisticFunction {
  @Override
  public double evaluate(final double[] data) {
    final int n = data.length;
    final double[] sortedData = data.clone();
    Arrays.sort(sortedData);
    final double[] counts = IntStream.range(0, n)
        .mapToDouble(i -> (double)
            IntStream.range(0, n).filter(j -> sortedData[j] == sortedData[i]).count())
        .toArray();
    final double mode = Arrays.stream(counts).max().orElse(Double.NaN);
    return mode;
  }
}
