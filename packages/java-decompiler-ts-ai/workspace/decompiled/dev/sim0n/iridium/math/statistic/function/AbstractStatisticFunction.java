package dev.sim0n.iridium.math.statistic.function;

public abstract class AbstractStatisticFunction implements StatisticFunction, dev.sim0n.iridium.math.helper.CommonMathFunctions {
  protected boolean biasCorrection;
  
  public AbstractStatisticFunction correctBias() {
    this.biasCorrection = 1;
    return this;
  }
  
  public boolean isBiasCorrection() {
    return this.biasCorrection;
  }
}