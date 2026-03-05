package dev.sim0n.app.test.impl.enumtest;

import dev.sim0n.app.test.Test;
import dev.sim0n.app.test.impl.enumtest.EnumConstant;

public class EnumConstantsTest implements Test {
  @Override
  public void run() {
    for (EnumConstant constant : (EnumConstant[]) EnumConstant.class.getEnumConstants()) {
      System.out.println((Object) constant);
    }
  }
}
