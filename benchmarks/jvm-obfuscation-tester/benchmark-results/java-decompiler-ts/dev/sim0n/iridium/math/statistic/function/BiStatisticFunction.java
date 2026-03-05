package dev.sim0n.iridium.math.statistic.function;

import dev.sim0n.iridium.math.helper.CommonMathFunctions;

public interface BiStatisticFunction extends CommonMathFunctions {
  abstract double evaluate(double[] arg0, double[] arg1);
}
