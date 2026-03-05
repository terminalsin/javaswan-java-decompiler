package dev.sim0n.iridium.math.statistic.function.impl;

import dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction;
import java.util.Arrays;
import java.util.stream.IntStream;

public class Mode extends AbstractStatisticFunction {
  @Override
  public double evaluate(double[] data) {
    int n = data.length;
    double[] sortedData = (double[]) data.clone();
    Arrays.sort(sortedData);
    double[] counts = IntStream.range(0, n)
        .mapToDouble(i ->
            IntStream.range(0, n).filter(j -> sortedData[j] == sortedData[i]).count())
        .toArray();
    return Arrays.stream(counts).max().orElse(Double.NaN);
  }
}
