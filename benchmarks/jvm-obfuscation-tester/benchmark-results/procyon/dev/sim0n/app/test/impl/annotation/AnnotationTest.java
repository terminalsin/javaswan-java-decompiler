package dev.sim0n.app.test.impl.annotation;

import java.lang.annotation.Annotation;
import dev.sim0n.app.test.Test;

@TestAnnotation(string = "Test", doubleValue = 0.36, intValue = 36)
public class AnnotationTest implements Test {
  @Override
  public void run() {
    final Class<? extends AnnotationTest> clazz = AnnotationTest.class;
    if (clazz.isAnnotationPresent(TestAnnotation.class)) {
      final TestAnnotation annotation = clazz.getAnnotation(TestAnnotation.class);
      final String value = annotation.string();
      final double doubleValue = annotation.doubleValue();
      final int intValue = annotation.intValue();
      System.out.println("Testing annotations");
      System.out.printf("%s, %s, %d%n", value, doubleValue, intValue);
      return;
    }
    throw new IllegalStateException("Annotation not present");
  }
}
