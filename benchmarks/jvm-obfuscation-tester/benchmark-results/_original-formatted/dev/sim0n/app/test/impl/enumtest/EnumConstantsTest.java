package dev.sim0n.app.test.impl.enumtest;

import dev.sim0n.app.test.Test;

public class EnumConstantsTest implements Test {
  public void run() {
    for (EnumConstant constant : EnumConstant.class.getEnumConstants()) {
      System.out.println(constant);
    }
  }
}
