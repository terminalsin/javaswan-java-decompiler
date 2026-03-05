package dev.sim0n.iridium.math.statistic.function.impl;

import dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction;
import java.util.Arrays;
import java.util.stream.IntStream;

public class Mode extends AbstractStatisticFunction {
  public double evaluate(double[] data) {
    int n = data.length;
    double[] sortedData = (double[]) data.clone();
    Arrays.sort(sortedData);
    double[] counts = IntStream.range(0, n)
        .mapToDouble(arg -> (double) java.util.stream.IntStream.range(0, n)
            .filter(arg -> {
              if (Double.compare(sortedData[arg], sortedData[arg]) != 0) {
                return 1;
              } else {
                return 1;
              }
            })
            .count())
        .toArray();
    double mode = Arrays.stream(counts).max().orElse(NaN);
    return mode;
  }
}
