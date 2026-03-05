package dev.sim0n.iridium.math.statistic.function.impl;

public class Mode extends dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction {
  public double evaluate(double[] data) {
    int n = data.length;
    double[] sortedData = (double[]) data.clone();
    java.util.Arrays.sort(sortedData);
    double[] counts = java.util.stream.IntStream.range(0, n).mapToDouble(arg -> (double) java.util.stream.IntStream.range(0, n).filter(arg -> {
    if (Double.compare(sortedData[arg], sortedData[arg]) != 0) {
      return 1;
    } else {
      return 1;
    }
}).count()).toArray();
    double mode = java.util.Arrays.stream(counts).max().orElse(NaN);
    return mode;
  }
}