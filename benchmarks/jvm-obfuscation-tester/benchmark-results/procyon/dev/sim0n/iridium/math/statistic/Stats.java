package dev.sim0n.iridium.math.statistic;

import dev.sim0n.iridium.math.statistic.function.impl.Variance;
import dev.sim0n.iridium.math.statistic.function.impl.Sum;
import dev.sim0n.iridium.math.statistic.function.impl.StandardDeviation;
import dev.sim0n.iridium.math.statistic.function.impl.Skewness;
import dev.sim0n.iridium.math.statistic.function.impl.Range;
import dev.sim0n.iridium.math.statistic.function.impl.Mode;
import dev.sim0n.iridium.math.statistic.function.impl.Min;
import dev.sim0n.iridium.math.statistic.function.impl.Midpoint;
import dev.sim0n.iridium.math.statistic.function.impl.Mean;
import dev.sim0n.iridium.math.statistic.function.impl.Max;
import dev.sim0n.iridium.math.statistic.function.impl.Kurtosis;
import dev.sim0n.iridium.math.statistic.function.impl.Entropy;
import java.util.Collection;
import dev.sim0n.iridium.math.statistic.function.StatisticFunction;

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

  public static double entropy(final double[] data) {
    return Stats.ENTROPY.evaluate(data);
  }

  public static double entropy(final Collection<? extends Number> data) {
    return Stats.ENTROPY.evaluate(data);
  }

  public static double kurtosis(final double[] data) {
    return Stats.KURTOSIS.evaluate(data);
  }

  public static double kurtosis(final Collection<? extends Number> data) {
    return Stats.KURTOSIS.evaluate(data);
  }

  public static double max(final double[] data) {
    return Stats.MAX.evaluate(data);
  }

  public static double max(final Collection<? extends Number> data) {
    return Stats.MAX.evaluate(data);
  }

  public static double mean(final double[] data) {
    return Stats.MEAN.evaluate(data);
  }

  public static double mean(final Collection<? extends Number> data) {
    return Stats.MEAN.evaluate(data);
  }

  public static double midpoint(final double[] data) {
    return Stats.MIDPOINT.evaluate(data);
  }

  public static double midpoint(final Collection<? extends Number> data) {
    return Stats.MIDPOINT.evaluate(data);
  }

  public static double min(final double[] data) {
    return Stats.MIN.evaluate(data);
  }

  public static double min(final Collection<? extends Number> data) {
    return Stats.MIN.evaluate(data);
  }

  public static double mode(final double[] data) {
    return Stats.MODE.evaluate(data);
  }

  public static double mode(final Collection<? extends Number> data) {
    return Stats.MODE.evaluate(data);
  }

  public static double range(final double[] data) {
    return Stats.RANGE.evaluate(data);
  }

  public static double range(final Collection<? extends Number> data) {
    return Stats.RANGE.evaluate(data);
  }

  public static double skewness(final double[] data) {
    return Stats.SKEWNESS.evaluate(data);
  }

  public static double skewness(final Collection<? extends Number> data) {
    return Stats.SKEWNESS.evaluate(data);
  }

  public static double stdDev(final double[] data) {
    return Stats.STANDARD_DEVIATION.evaluate(data);
  }

  public static double stdDev(final Collection<? extends Number> data) {
    return Stats.STANDARD_DEVIATION.evaluate(data);
  }

  public static double sum(final double[] data) {
    return Stats.SUM.evaluate(data);
  }

  public static double sum(final Collection<? extends Number> data) {
    return Stats.SUM.evaluate(data);
  }

  public static double variance(final double[] data) {
    return Stats.VARIANCE.evaluate(data);
  }

  public static double variance(final Collection<? extends Number> data) {
    return Stats.VARIANCE.evaluate(data);
  }

  private Stats() {
    throw new UnsupportedOperationException("This is a utility class and cannot be instantiated");
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
