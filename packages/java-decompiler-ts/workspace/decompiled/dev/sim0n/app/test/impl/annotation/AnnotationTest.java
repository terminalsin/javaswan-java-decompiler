package dev.sim0n.app.test.impl.annotation;

import dev.sim0n.app.test.Test;

@TestAnnotation(string = "Test", doubleValue = 0.36, intValue = 36)
public class AnnotationTest implements Test {
  public void run() {
    Class clazz = AnnotationTest.class;
    if (!clazz.isAnnotationPresent(TestAnnotation.class)) {
      throw new IllegalStateException("Annotation not present");
    }
    TestAnnotation annotation = (TestAnnotation) clazz.getAnnotation(TestAnnotation.class);
    String value = annotation.string();
    double doubleValue = annotation.doubleValue();
    int intValue = annotation.intValue();
    System.out.println("Testing annotations");
    System.out.printf("%s, %s, %d%n", value, doubleValue, intValue);
  }
}