package dev.sim0n.iridium.math.statistic.function;

import dev.sim0n.iridium.math.helper.CommonMathFunctions;

public abstract class AbstractStatisticFunction implements StatisticFunction, CommonMathFunctions {
  protected boolean biasCorrection;
  
  public <T extends AbstractStatisticFunction> T correctBias() {
    this.biasCorrection = 1;
    return this;
  }
  
  public boolean isBiasCorrection() {
    return this.biasCorrection;
  }
}