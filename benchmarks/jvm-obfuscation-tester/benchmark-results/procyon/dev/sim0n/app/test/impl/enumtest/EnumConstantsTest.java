package dev.sim0n.app.test.impl.enumtest;

import dev.sim0n.app.test.Test;

public class EnumConstantsTest implements Test {
  @Override
  public void run() {
    for (final EnumConstant constant : EnumConstant.class.getEnumConstants()) {
      System.out.println(constant);
    }
  }
}
