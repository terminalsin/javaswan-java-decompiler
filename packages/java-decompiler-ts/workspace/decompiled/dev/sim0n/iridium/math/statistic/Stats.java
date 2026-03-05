package dev.sim0n.iridium.math.statistic;

import dev.sim0n.iridium.math.statistic.function.StatisticFunction;
import dev.sim0n.iridium.math.statistic.function.impl.Entropy;
import dev.sim0n.iridium.math.statistic.function.impl.Kurtosis;
import dev.sim0n.iridium.math.statistic.function.impl.Max;
import dev.sim0n.iridium.math.statistic.function.impl.Mean;
import dev.sim0n.iridium.math.statistic.function.impl.Midpoint;
import dev.sim0n.iridium.math.statistic.function.impl.Min;
import dev.sim0n.iridium.math.statistic.function.impl.Mode;
import dev.sim0n.iridium.math.statistic.function.impl.Range;
import dev.sim0n.iridium.math.statistic.function.impl.Skewness;
import dev.sim0n.iridium.math.statistic.function.impl.StandardDeviation;
import dev.sim0n.iridium.math.statistic.function.impl.Sum;
import dev.sim0n.iridium.math.statistic.function.impl.Variance;
import java.util.Collection;

public final class Stats {
  private static final StatisticFunction ENTROPY;
  private static final StatisticFunction KURTOSIS;
  private static final StatisticFunction MAX;
  private static final StatisticFunction MEAN;
  private static final StatisticFunction MIDPOINT;
  private static final StatisticFunction MIN;
  private static final StatisticFunction MODE;
  private static final StatisticFunction RANGE;
  private static final StatisticFunction SKEWNESS;
  private static final StatisticFunction STANDARD_DEVIATION;
  private static final StatisticFunction SUM;
  private static final StatisticFunction VARIANCE;
  
  public static double entropy(double[] data) {
    return ENTROPY.evaluate(data);
  }
  
  public static double entropy(Collection<? extends Number> data) {
    return ENTROPY.evaluate(data);
  }
  
  public static double kurtosis(double[] data) {
    return KURTOSIS.evaluate(data);
  }
  
  public static double kurtosis(Collection<? extends Number> data) {
    return KURTOSIS.evaluate(data);
  }
  
  public static double max(double[] data) {
    return MAX.evaluate(data);
  }
  
  public static double max(Collection<? extends Number> data) {
    return MAX.evaluate(data);
  }
  
  public static double mean(double[] data) {
    return MEAN.evaluate(data);
  }
  
  public static double mean(Collection<? extends Number> data) {
    return MEAN.evaluate(data);
  }
  
  public static double midpoint(double[] data) {
    return MIDPOINT.evaluate(data);
  }
  
  public static double midpoint(Collection<? extends Number> data) {
    return MIDPOINT.evaluate(data);
  }
  
  public static double min(double[] data) {
    return MIN.evaluate(data);
  }
  
  public static double min(Collection<? extends Number> data) {
    return MIN.evaluate(data);
  }
  
  public static double mode(double[] data) {
    return MODE.evaluate(data);
  }
  
  public static double mode(Collection<? extends Number> data) {
    return MODE.evaluate(data);
  }
  
  public static double range(double[] data) {
    return RANGE.evaluate(data);
  }
  
  public static double range(Collection<? extends Number> data) {
    return RANGE.evaluate(data);
  }
  
  public static double skewness(double[] data) {
    return SKEWNESS.evaluate(data);
  }
  
  public static double skewness(Collection<? extends Number> data) {
    return SKEWNESS.evaluate(data);
  }
  
  public static double stdDev(double[] data) {
    return STANDARD_DEVIATION.evaluate(data);
  }
  
  public static double stdDev(Collection<? extends Number> data) {
    return STANDARD_DEVIATION.evaluate(data);
  }
  
  public static double sum(double[] data) {
    return SUM.evaluate(data);
  }
  
  public static double sum(Collection<? extends Number> data) {
    return SUM.evaluate(data);
  }
  
  public static double variance(double[] data) {
    return VARIANCE.evaluate(data);
  }
  
  public static double variance(Collection<? extends Number> data) {
    return VARIANCE.evaluate(data);
  }
  
  static {
    ENTROPY = new Entropy();
    KURTOSIS = new Kurtosis();
    MAX = new Max();
    MEAN = new Mean();
    MIDPOINT = new Midpoint();
    MIN = new Min();
    MODE = new Mode();
    RANGE = new Range();
    SKEWNESS = new Skewness();
    STANDARD_DEVIATION = new StandardDeviation();
    SUM = new Sum();
    VARIANCE = new Variance();
  }
}