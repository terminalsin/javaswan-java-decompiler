package dev.sim0n.iridium.math.statistic;

public final class Stats {
  private static final function.StatisticFunction ENTROPY;
  private static final function.StatisticFunction KURTOSIS;
  private static final function.StatisticFunction MAX;
  private static final function.StatisticFunction MEAN;
  private static final function.StatisticFunction MIDPOINT;
  private static final function.StatisticFunction MIN;
  private static final function.StatisticFunction MODE;
  private static final function.StatisticFunction RANGE;
  private static final function.StatisticFunction SKEWNESS;
  private static final function.StatisticFunction STANDARD_DEVIATION;
  private static final function.StatisticFunction SUM;
  private static final function.StatisticFunction VARIANCE;
  
  public static double entropy(double[] data) {
    return ENTROPY.evaluate(data);
  }
  
  public static double entropy(java.util.Collection data) {
    return ENTROPY.evaluate(data);
  }
  
  public static double kurtosis(double[] data) {
    return KURTOSIS.evaluate(data);
  }
  
  public static double kurtosis(java.util.Collection data) {
    return KURTOSIS.evaluate(data);
  }
  
  public static double max(double[] data) {
    return MAX.evaluate(data);
  }
  
  public static double max(java.util.Collection data) {
    return MAX.evaluate(data);
  }
  
  public static double mean(double[] data) {
    return MEAN.evaluate(data);
  }
  
  public static double mean(java.util.Collection data) {
    return MEAN.evaluate(data);
  }
  
  public static double midpoint(double[] data) {
    return MIDPOINT.evaluate(data);
  }
  
  public static double midpoint(java.util.Collection data) {
    return MIDPOINT.evaluate(data);
  }
  
  public static double min(double[] data) {
    return MIN.evaluate(data);
  }
  
  public static double min(java.util.Collection data) {
    return MIN.evaluate(data);
  }
  
  public static double mode(double[] data) {
    return MODE.evaluate(data);
  }
  
  public static double mode(java.util.Collection data) {
    return MODE.evaluate(data);
  }
  
  public static double range(double[] data) {
    return RANGE.evaluate(data);
  }
  
  public static double range(java.util.Collection data) {
    return RANGE.evaluate(data);
  }
  
  public static double skewness(double[] data) {
    return SKEWNESS.evaluate(data);
  }
  
  public static double skewness(java.util.Collection data) {
    return SKEWNESS.evaluate(data);
  }
  
  public static double stdDev(double[] data) {
    return STANDARD_DEVIATION.evaluate(data);
  }
  
  public static double stdDev(java.util.Collection data) {
    return STANDARD_DEVIATION.evaluate(data);
  }
  
  public static double sum(double[] data) {
    return SUM.evaluate(data);
  }
  
  public static double sum(java.util.Collection data) {
    return SUM.evaluate(data);
  }
  
  public static double variance(double[] data) {
    return VARIANCE.evaluate(data);
  }
  
  public static double variance(java.util.Collection data) {
    return VARIANCE.evaluate(data);
  }
  
  static {
    ENTROPY = new function.impl.Entropy();
    KURTOSIS = new function.impl.Kurtosis();
    MAX = new function.impl.Max();
    MEAN = new function.impl.Mean();
    MIDPOINT = new function.impl.Midpoint();
    MIN = new function.impl.Min();
    MODE = new function.impl.Mode();
    RANGE = new function.impl.Range();
    SKEWNESS = new function.impl.Skewness();
    STANDARD_DEVIATION = new function.impl.StandardDeviation();
    SUM = new function.impl.Sum();
    VARIANCE = new function.impl.Variance();
  }
}