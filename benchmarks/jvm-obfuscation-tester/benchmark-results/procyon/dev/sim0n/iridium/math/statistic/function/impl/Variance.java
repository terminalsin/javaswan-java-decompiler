package dev.sim0n.iridium.math.statistic.function.impl;

import java.util.Arrays;
import java.util.Objects;
import java.util.Optional;
import dev.sim0n.iridium.function.DoubleBiFunction;
import dev.sim0n.iridium.function.DoubleObjFunction;
import dev.sim0n.iridium.math.statistic.function.StatisticFunction;
import dev.sim0n.iridium.math.statistic.function.AbstractStatisticFunction;

public class Variance extends AbstractStatisticFunction {
  private final StatisticFunction m1;
  private final DoubleObjFunction<double[]> meanEvaluatorFunc;
  private final DoubleBiFunction<double[], Optional<Double>> innerVarianceFunc;

  public Variance() {
    this.m1 = new Mean();
    final StatisticFunction m1 = this.m1;
    Objects.requireNonNull(m1);
    this.meanEvaluatorFunc = m1::evaluate;
    this.innerVarianceFunc = ((data, meanOpt) -> {
      final int n = data.length;
      final double mean = meanOpt.orElse(this.meanEvaluatorFunc.apply(data));
      final double variance =
          Arrays.stream(data).map(value -> this.square(value - mean)).sum();
      final double variance2 = variance / (this.biasCorrection ? (n - 1) : ((double) n));
      return variance2;
    });
  }

  @Override
  public double evaluate(final double[] data) {
    return this.innerVarianceFunc.apply(data, Optional.empty());
  }

  @Override
  public double evaluate(final double[] data, final double mean) {
    return this.innerVarianceFunc.apply(data, Optional.of(mean));
  }
}
