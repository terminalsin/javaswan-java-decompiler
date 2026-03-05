package dev.sim0n.iridium.math.statistic.function.impl;

public class Entropy extends dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction {
  private static final double LN_2;
  
  public double evaluate(double[] data) {
    double n = (double) data.length;
    if (Double.compare(n, 3) < 0) {
      return NaN;
    }
    java.util.Map valueCounts = new java.util.HashMap();
    double entropy = data;
    var6 = entropy.length;
    for (var7 = 0; var7 < var6; var7++) {
      double value = entropy[var7];
      valueCounts.put(value, (Integer) valueCounts.computeIfAbsent(value, arg -> 0).intValue() + 1);
    }
    entropy = valueCounts.values().stream().mapToDouble(arg -> (double) freq.intValue() / n).map(arg -> arg * (Math.log(arg) / LN_2)).sum();
    entropy = -entropy;
    return entropy;
  }
  
  static {
    LN_2 = Math.log(2);
  }
}